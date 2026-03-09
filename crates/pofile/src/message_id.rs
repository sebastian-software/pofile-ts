//! Stable message ID generation.

use std::collections::BTreeMap;

const ID_LENGTH: usize = 8;
const BASE64URL: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/// Message input used for batch message ID generation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MessageIdInput {
    /// Source message text.
    pub message: String,
    /// Optional message context.
    pub context: Option<String>,
}

impl MessageIdInput {
    /// Create a new message input.
    #[must_use]
    pub fn new(message: impl Into<String>, context: Option<impl Into<String>>) -> Self {
        Self {
            message: message.into(),
            context: context.map(Into::into),
        }
    }
}

/// Generate a stable 8-character Base64URL message ID.
#[must_use]
pub fn generate_message_id(message: &str, context: Option<&str>) -> String {
    let mut input = String::new();
    if let Some(context) = context {
        input.push_str(context);
    }
    input.push_str(message);

    let digest = sha256(input.as_bytes());
    bytes_to_base64url(&digest)
}

/// Generate message IDs for multiple messages.
#[must_use]
pub fn generate_message_ids(inputs: &[MessageIdInput]) -> BTreeMap<String, String> {
    let mut results = BTreeMap::new();

    for input in inputs {
        let id = generate_message_id(&input.message, input.context.as_deref());
        let key = match &input.context {
            Some(context) => format!("{}\u{0004}{context}", input.message),
            None => input.message.clone(),
        };
        results.insert(key, id);
    }

    results
}

fn bytes_to_base64url(bytes: &[u8]) -> String {
    let mut result = String::with_capacity(ID_LENGTH);
    let mut bits = 0u32;
    let mut value = 0u32;

    for byte in bytes {
        if result.len() == ID_LENGTH {
            break;
        }

        value = (value << 8) | u32::from(*byte);
        bits += 8;

        while bits >= 6 && result.len() < ID_LENGTH {
            bits -= 6;
            let index = ((value >> bits) & 0x3f) as usize;
            result.push(char::from(BASE64URL[index]));
        }
    }

    result
}

fn sha256(bytes: &[u8]) -> [u8; 32] {
    let mut padded = bytes.to_vec();
    let bit_length = (padded.len() as u64) * 8;
    padded.push(0x80);
    while (padded.len() % 64) != 56 {
        padded.push(0);
    }
    padded.extend_from_slice(&bit_length.to_be_bytes());

    let mut state = [
        0x6a09e667u32,
        0xbb67ae85,
        0x3c6ef372,
        0xa54ff53a,
        0x510e527f,
        0x9b05688c,
        0x1f83d9ab,
        0x5be0cd19,
    ];

    for chunk in padded.chunks_exact(64) {
        let mut w = [0u32; 64];
        for (index, word) in chunk.chunks_exact(4).enumerate().take(16) {
            w[index] = u32::from_be_bytes([word[0], word[1], word[2], word[3]]);
        }

        for index in 16..64 {
            let s0 = w[index - 15].rotate_right(7)
                ^ w[index - 15].rotate_right(18)
                ^ (w[index - 15] >> 3);
            let s1 = w[index - 2].rotate_right(17)
                ^ w[index - 2].rotate_right(19)
                ^ (w[index - 2] >> 10);
            w[index] = w[index - 16]
                .wrapping_add(s0)
                .wrapping_add(w[index - 7])
                .wrapping_add(s1);
        }

        let mut a = state[0];
        let mut b = state[1];
        let mut c = state[2];
        let mut d = state[3];
        let mut e = state[4];
        let mut f = state[5];
        let mut g = state[6];
        let mut h = state[7];

        for index in 0..64 {
            let sum1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choice = (e & f) ^ ((!e) & g);
            let temp1 = h
                .wrapping_add(sum1)
                .wrapping_add(choice)
                .wrapping_add(K[index])
                .wrapping_add(w[index]);
            let sum0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = sum0.wrapping_add(majority);

            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        state[0] = state[0].wrapping_add(a);
        state[1] = state[1].wrapping_add(b);
        state[2] = state[2].wrapping_add(c);
        state[3] = state[3].wrapping_add(d);
        state[4] = state[4].wrapping_add(e);
        state[5] = state[5].wrapping_add(f);
        state[6] = state[6].wrapping_add(g);
        state[7] = state[7].wrapping_add(h);
    }

    let mut output = [0u8; 32];
    for (index, word) in state.iter().enumerate() {
        output[index * 4..index * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    output
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::{generate_message_id, generate_message_ids, MessageIdInput};

    #[test]
    fn generate_message_id_matches_current_node_implementation() {
        assert_eq!(generate_message_id("Hello", None), "GF-NsyJx");
        assert_eq!(generate_message_id("Hello World", None), "pZGm1Av0");
        assert_eq!(generate_message_id("Open", Some("menu.file")), "QWh_hL4_");
        assert_eq!(generate_message_id("Привет мир 🌍", None), "Xp6zAZTu");
    }

    #[test]
    fn generate_message_ids_batches_results() {
        let ids = generate_message_ids(&[
            MessageIdInput::new("Hello", None::<String>),
            MessageIdInput::new("Open", Some("menu.file")),
        ]);

        assert_eq!(
            ids,
            BTreeMap::from([
                (String::from("Hello"), String::from("GF-NsyJx")),
                (
                    String::from("Open\u{0004}menu.file"),
                    String::from("QWh_hL4_"),
                ),
            ])
        );
    }
}
