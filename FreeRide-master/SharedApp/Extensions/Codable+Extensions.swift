//
//  Codable+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension Encodable {

    func toJSON(with encoder: JSONEncoder = RiderAppJSONEncoder()) -> Data {
        do {
            return try encoder.encode(self)
        } catch {
            fatalError("Could not encode object: \(error)")
        }
    }

    /// Converts encodable objects into dictionaries so they can be used as query parameters
    func toJSONDictionary() -> [String: Any] {
        let encoded = try? JSONSerialization.jsonObject(with: RiderAppJSONEncoder().encode(self))
        let dictionary = encoded as? [String: Any] ?? [:]
        return dictionary
    }
}

extension Decodable {

    init(json: Any, with decoder: JSONDecoder = RiderAppJSONDecoder()) throws {
        let data = try JSONSerialization.data(withJSONObject: json)
        try self.init(jsonData: data, with: decoder)
    }

    init(jsonData: Data, with decoder: JSONDecoder = RiderAppJSONDecoder()) throws {
        self = try decoder.decode(Self.self, from: jsonData)
    }
}
