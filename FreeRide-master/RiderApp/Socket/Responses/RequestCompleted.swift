//
//  RequestCompleted.swift
//  RiderApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RequestCompleted: Listener {

    static var listener: String = "request-completed"

    let id: String
    let driverName: String
    let licensePlate: String?
    let driverPhoto: String?
    let eta: Float?
    let origin: Address
    let destination: Address
    let isADA: Bool
    let status: Int
    let createdTimestamp: Date
}
