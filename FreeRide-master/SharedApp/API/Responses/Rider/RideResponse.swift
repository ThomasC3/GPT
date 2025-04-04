//
//  RideResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RideResponse: Codable {

    struct Message: Codable {

        let createdTimestamp: Date
        let message: String
        let owner: String
        let ride: String
        let sender: String
    }

    let id: String
    let driverName: String
    let licensePlate: String?
    let driverPhoto: String?
    let eta: Float?
    let origin: Address
    let destination: Address
    let passengers: Int
    let rating: Int?
    let savingsValue1: Float?
    let savingsValue2: Float?
    let status: Int
    let requestMessages: [Message]?
    let paymentStatus: String?
    let totalPrice: Int?
    let discount: Int?
    let totalWithoutDiscount: Int?
    let currency: String?
    let driverArrivedTimestamp: String?
    let tipTotal: Int?
    let tipCurrency: String?
    
    let createdTimestamp: Date
    let isADA: Bool
}
