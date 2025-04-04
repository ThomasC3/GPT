//
//  GetAddressesResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/5/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct GetAddressesResponse: Codable {

    let isValid: Bool?
    let address: String
    var latitude: Float
    var longitude: Float
    var fixedStop: String?
    
    init(address: String, latitude: Float, longitude: Float, fixedStop: String?) {
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.isValid = true
        self.fixedStop = fixedStop
    }

    var addressShort: String? {
        return address.components(separatedBy: ",").first
    }

    var addressEnd: String {
        guard let addressShort = addressShort else {
            return address
        }

        return address.replacingOccurrences(of: "\(addressShort), ", with: "")
    }
}
