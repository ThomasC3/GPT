//
//  QuoteQuery.swift
//  FreeRide
//

import Foundation

struct QuoteQuery: Codable {

    let locationId: String
    let passengers: Int
    var originLatitude: Float
    var originLongitude: Float
    var destinationLatitude: Float
    var destinationLongitude: Float
    let pwywValue: Int?
}
