//
//  ErrorResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

/// Represents an error response from the server.
///
/// This struct is designed to handle various error formats returned by the API,
/// accommodating both string and integer error codes. It can be used to decode
/// JSON error responses or to create error instances manually in code.
struct ErrorResponse: Codable {
    let code: String?
    let message: String

    enum CodingKeys: String, CodingKey {
        case code
        case message
    }

    init(code: Int, message: String) {
        self.code = String(code)
        self.message = message
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        message = try container.decode(String.self, forKey: .message)

        // Try to decode code as String first
        if let stringCode = try? container.decode(String.self, forKey: .code) {
            code = stringCode
        } else if let intCode = try? container.decode(Int.self, forKey: .code) {
            // If String decoding fails, try Int and convert to String
            code = String(intCode)
        } else {
            // If both fail, set code to nil
            code = nil
        }
    }
}
