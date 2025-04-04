//
//  RideUpdatesResponse.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RideUpdatesResponse: Listener {

    static var listener: String = "ride-updates"
    
    let ride: String
    let status: Int
    let message: String?
    let driverArrivedTimestamp: String?
    let paymentStatus: String?
    let totalPrice: Int?
    let discount: Int?
    let totalWithoutDiscount: Int?
    let currency: String?
}
