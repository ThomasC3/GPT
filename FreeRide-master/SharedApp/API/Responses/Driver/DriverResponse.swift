//
//  DriverResponse.swift
//  FreeRide
//

import Foundation
import UIKit

struct DriverResponse: Codable {
    
    let id: String
    let firstName: String
    let lastName: String
    let isOnline: Bool
    let isAvailable: Bool
    let status: String
    let currentLocation: CurrentLocation
    let vehicle: VehicleResponse?
    let loggedOutTimestamp: String?
    
    init(id: String, firstName: String, lastName: String, isOnline: Bool, isAvailable: Bool, status: String, currentLocation: CurrentLocation, vehicle: VehicleResponse?, loggedOutTimestamp: String?) {
        self.id = id
        self.firstName = firstName
        self.lastName = lastName
        self.isOnline = isOnline
        self.isAvailable = isAvailable
        self.status = status
        self.currentLocation = currentLocation
        self.vehicle = vehicle
        self.loggedOutTimestamp = loggedOutTimestamp
    }
    
    var name: String! {
        return "\(firstName) \(lastName)"
    }
    
    func getImage() -> UIImage {
        return #imageLiteral(resourceName: "round_person_black_36pt")
//        switch self.type {
//        case 1:
//            return #imageLiteral(resourceName: "round_airport_shuttle_black_20pt")
//        case 2:
//            return #imageLiteral(resourceName: "round_local_shipping_black_20pt")
//        case 3:
//            return #imageLiteral(resourceName: "round_directions_car_filled_black_20pt")
//        default:
//            return #imageLiteral(resourceName: "round_airport_shuttle_black_20pt")
//        }
    }
    
}

struct CurrentLocation: Codable {
    
    let latitude: Double
    let longitude: Double

    init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }

}
