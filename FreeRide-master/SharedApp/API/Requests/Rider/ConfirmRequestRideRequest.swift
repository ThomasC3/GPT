//
//  ConfirmRequestRideRequest.swift
//  FreeRide
//

import Foundation

struct ConfirmRequestRideRequest: Codable {

    let paymentIntentStatus: Int
    let paymentIntentId: String
}
