//
//  UserLocation.swift
//  MapView
//
//  Created by Andrew Boryk on 7/2/18.
//  Copyright © 2018 Rocket n Mouse. All rights reserved.
//

import CoreLocation

protocol UserLocationDelegate: AnyObject {
    func didUpdate(_ location: UserLocation)
    func didFailUpdate(_ location: UserLocation, error: Error)
}

class UserLocation: NSObject {
    
    weak var delegate: UserLocationDelegate?
    var latitude: Double?
    var longitude: Double?
    var isLocationRequesting = false
    var updateLocationContinuously = false
    
    var coordinate: CLLocationCoordinate2D? {
        guard let latitude = latitude, let longitude = longitude else {
            return nil
        }
        
        return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
    
    private let locationManager = CLLocationManager()
    
    // MARK: - Initialize
    init(delegate: UserLocationDelegate) {
        self.delegate = delegate
    }
    
    // MARK: - Shared
    func startUpdatingLocation() {
        guard !isLocationRequesting else {
            return
        }
        
        isLocationRequesting = true
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.requestWhenInUseAuthorization()
    }
    
    func stopUpdatingLocation() {
        isLocationRequesting = false
        locationManager.stopUpdatingLocation()
    }
}

extension UserLocation: CLLocationManagerDelegate {

    // For newer iOS versions (iOS 14 and later)
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if #available(iOS 14.0, *) {
            if manager.authorizationStatus == .notDetermined {
                return
            }

            locationManager.startUpdatingLocation()
        }
        else {
            assertionFailure("Not expected to be called on lower iOS versions")
        }
    }

    // For older iOS versions (up to iOS <14)
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if #available(iOS 14.0, *) {
            assertionFailure("Not expected to be called on newer iOS versions")
        }
        else {
            if status == .notDetermined {
                return
            }

            locationManager.startUpdatingLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if !updateLocationContinuously {
            stopUpdatingLocation()
        }

        dispatchPrecondition(condition: .onQueue(.main))
        delegate?.didFailUpdate(self, error: error)
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.last, location.horizontalAccuracy > 0 {
            latitude = location.coordinate.latitude
            longitude = location.coordinate.longitude
        }
        
        if !updateLocationContinuously {
            stopUpdatingLocation()
        }
        
        dispatchPrecondition(condition: .onQueue(.main))
        delegate?.didUpdate(self)
    }
}
