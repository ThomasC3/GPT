//
//  GetVehicleResponse.swift
//  FreeRide
//

import Foundation

struct DriverStatusResponse: Codable {
    let isAvailable: Bool
    let vehicle: VehicleResponse?
    let unavailabilityReasons: [String]?
}
