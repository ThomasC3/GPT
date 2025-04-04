//
//  CancelRideRequest.swift
//  FreeRide
//
//  Created by Rui Magalhães on 29/03/2023.
//  Copyright © 2023 Circuit. All rights reserved.
//

import Foundation

struct CancelRideRequest: Codable {

    let noShow: Bool
    let latitude: Float?
    let longitude: Float?
}
