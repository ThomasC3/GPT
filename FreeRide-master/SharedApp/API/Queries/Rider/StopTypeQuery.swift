//
//  StopTypeQuery.swift
//  FreeRide
//

import Foundation

struct StopTypeQuery: Codable {

    var latitude: Float
    var longitude: Float
    var locationId: String
    var selectedStop: String?
}
