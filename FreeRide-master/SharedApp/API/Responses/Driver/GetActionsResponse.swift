//
//  GetActionsResponse.swift
//  FreeRide
//
//  Created by Rui Magalhães on 08/10/2019.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct GetActionsResponse: Codable {

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
    let stopType: String
    let eta: String?
    let hailed: Bool
    let driverArrivedTimestamp: String?
    let fixedStopId: String?
}
