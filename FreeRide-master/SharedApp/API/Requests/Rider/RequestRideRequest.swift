//
//  RequestRideRequest.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RequestRideRequest: Codable {

    let location: String
    let passengers: Int
    let isADA: Bool
    let origin: Address
    let destination: Address
    let message: String?
    let pwywValue: Int?
    let skipPaymentIntentCreation: Bool
}
