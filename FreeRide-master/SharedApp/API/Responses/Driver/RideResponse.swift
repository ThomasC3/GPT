//
//  RideResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/18/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RideResponse: Codable {

    struct RideAddress: Codable {

        let address: String?
        var latitude: Float?
        var longitude: Float?
    }

    struct Message: Codable {

        let createdTimestamp: Date
        let message: String
        let owner: String
        let ride: String
        let sender: String
    }

    let id: String
    let riderName: String?
    let origin: RideAddress?
    let destination: RideAddress?
    let passengers: Int
    let status: Int
    let rating: Int?
    let requestMessages: [Message]?
}
