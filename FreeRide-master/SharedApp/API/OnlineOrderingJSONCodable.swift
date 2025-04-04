//
//  RiderAppJSONCodable.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/2/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

class RiderAppJSONDecoder: JSONDecoder {

    override init() {
        super.init()
        dateDecodingStrategy = .formatted(dateFormatter)
        dataDecodingStrategy = .base64
    }
}

class RiderAppJSONEncoder: JSONEncoder {

    override init() {
        super.init()
        dateEncodingStrategy = .formatted(dateFormatter)
        dataEncodingStrategy = .base64
    }
}

private let dateFormatter: DateFormatter = DateFormatter(dateFormat: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
