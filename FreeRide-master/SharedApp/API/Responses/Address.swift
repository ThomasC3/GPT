//
//  Address.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct Address: Codable {

    let isValid: Bool?
    let address: String
    var latitude: Float
    var longitude: Float
    var fixedStopId: String?
    var isFixedStop: Bool?

    init(address: String, latitude: Float, longitude: Float, fixedStopId: String?, isFixedStop: Bool) {
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.fixedStopId = fixedStopId
        self.isFixedStop = isFixedStop
        self.isValid = true
    }
    
    init(address: String, latitude: Float, longitude: Float, fixedStopId: String?) {
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.fixedStopId = fixedStopId
        self.isFixedStop = fixedStopId != nil
        self.isValid = true
    }

    init(response: GetAddressesResponse) {
        self.address = response.address
        self.latitude = response.latitude
        self.longitude = response.longitude
        self.fixedStopId = response.fixedStop
        self.isFixedStop = response.fixedStop != nil
        self.isValid = response.isValid
    }
    
    var addressShort: String? {
        return address.components(separatedBy: ",").first
    }
}
