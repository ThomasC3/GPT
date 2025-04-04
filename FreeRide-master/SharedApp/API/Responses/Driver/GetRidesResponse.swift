//
//  GetRidesResponse.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/15/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct GetRidesResponse: Codable {

    struct Rider: Codable {

        let name: String?
        let phone: String?
    }

    struct RideAddress: Codable {

        let address: String?
        var latitude: Float?
        var longitude: Float?
    }

    let id: String
    let rider: Rider?
    let origin: RideAddress?
    let destination: RideAddress?
    let isADA: Bool
    let passengers: Int
    let status: Int
    let createdTimestamp: Date
    let rating: Int?
    let current: Bool
    let driverArrivedTimestamp: String?
}
