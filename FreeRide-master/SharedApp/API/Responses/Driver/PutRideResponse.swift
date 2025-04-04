//
//  PutRideResponse.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct PutRideResponse: Codable {

    let id: String
    let location: String
    let passengers: Int
    let isADA: Bool
}
