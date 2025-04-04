//
//  ReportRideResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/24/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct ReportRideResponse: Codable {

    struct Ride: Codable {
        let id: String
        let location: String
    }

    let reason: String
    let ride: Ride

}
