//
//  RidePolylineResponse.swift
//  Circuit
//

import Foundation

struct RideStatusResponse: Codable {

    let stops: Int?
    let eta: Float?
    let pooling: Bool?
}
