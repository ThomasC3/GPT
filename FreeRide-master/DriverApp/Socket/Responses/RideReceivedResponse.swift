//
//  RideReceivedResponse.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RideReceivedResponse: Listener {

    struct Rider: Codable {

        let name: String
        let phone: String
    }

    static var listener: String = "ride-request-received"
    
    let ride: String
    let rider: Rider
    let origin: Address
    let destination: Address
    let isADA: Bool
    let passengers: Int
    let status: Int
    let createdTimestamp: Date
}
