//
//  GetAddressesQuery.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct GetAddressesQuery: Codable {

    let location: String
    let latitude: Float?
    let longitude: Float?
}
