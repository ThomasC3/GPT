//
//  CLLocationManager+Extensions.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 05/09/2023.
//  Copyright © 2023 Circuit. All rights reserved.
//

import CoreLocation

extension CLAuthorizationStatus {

    var debugDescription: String {
        switch self {
        case .notDetermined:
            return "Not Determined"
        case .restricted:
            return "Restricted"
        case .denied:
            return "Denied"
        case .authorizedAlways:
            return "Authorized Always"
        case .authorizedWhenInUse:
            return "Authorized When In Use"
        @unknown default:
            return "Unknown"
        }
    }

}

extension CLLocationManager {

    static func locationServicesEnabledAndAppPermissionAuthorized() -> Bool {
        let deviceLocationServicesEnabled = CLLocationManager.locationServicesEnabled()
        print("Device Location Services State: \(deviceLocationServicesEnabled ? "enabled" : "disabled")")

        if !deviceLocationServicesEnabled {
            return false
        }

        let locationAppAuthorizationStatus = CLLocationManager.authorizationStatus()
        print("Location App Authorization Status: \(locationAppAuthorizationStatus.debugDescription)")

        switch locationAppAuthorizationStatus {
        case .notDetermined:
            // User has not made a choice
            break
        case .restricted,
             .denied:
            // User has denied/restricted location access
            return false
        case .authorizedAlways,
             .authorizedWhenInUse:
            break
        @unknown default:
            assertionFailure("Unknown location authorization status.")
        }

        return true
    }

}
