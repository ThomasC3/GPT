//
//  LocationResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import GoogleMaps

struct LocationResponse: Codable {

    struct TimeSlot: Codable {

        let day: String
        let openTime: String
        let closeTime: String
        let closed: Bool
    }

    struct GeoCoordinate: Codable {

        let latitude: Float
        let longitude: Float
    }

    struct Advertisement: Codable {

        let imageUrl: String?
        let url: String?
    }
    
    struct LocationAlert: Codable {
        
        let title: String?
        let copy: String?
    }
    
    struct PwywInformation: Codable {
        let pwywOptions: [Int]
        let maxCustomValue: Int
        let currency: String
    }
    
    struct TipInformation: Codable {
        let tipOptions: [Int]
        let maxCustomValue: Int
        let currency: String
    }
    
    struct FailedAgeRequirementAlert: Codable {
        let title: String
        let copy: String
    }
    
    let id: String
    let name: String
    let closedCopy: String
    let inactiveCopy: String
    let isActive: Bool
    let isADA: Bool
    let isUsingServiceTimes: Bool
    let poolingEnabled: Bool?
    let isAvailabilityOverlayActive: Bool?
    let serviceHours: [TimeSlot]
    let serviceArea: [GeoCoordinate]
    let advertisement: Advertisement?
    let showAlert: Bool?
    let alert: LocationAlert?
    let isSuspended: Bool?
    let hasAppService: Bool?
    let suspendedCopy : String?
    let suspendedTitle : String?
    let isOpen: Bool
    let paymentEnabled: Bool?
    let paymentInformation: LocationPrices?
    let fixedStopEnabled: Bool?
    let pwywEnabled: Bool?
    let pwywInformation: PwywInformation?
    let tipEnabled: Bool?
    let tipInformation: TipInformation?
    let pwywCopy: String?
    let riderPickupDirections: Bool?
    let riderAgeRequirement: Int?
    let meetsAgeRequirement: Bool?
    let failedAgeRequirementAlert: FailedAgeRequirementAlert?
    let blockLiveDriverLocation : Bool?
    let driverLocationUpdateInterval : Int?
    let breakDurations: [Int]?
    let fleetEnabled: Bool?
    let ridesFareCopy: String?
    #if DRIVER
    let zones: [ZoneResponse]?
    #endif
    
    func serviceHoursFormatted(forDay day: String) -> String {
        let defaultString = isOpen ? "locations_open".localize() : "locations_closed".localize()

        guard let hours = serviceHours.first(where: { $0.day == day }) else {
            return defaultString
        }
        
        if hours.closed {
            return "locations_closed".localize()
        }

        let serverFormatter = DateFormatter(dateFormat: "HH:mm")

        guard let openTime = serverFormatter.date(from: hours.openTime),
            let closeTime = serverFormatter.date(from: hours.closeTime) else {
                return defaultString
        }

        let dateFormatter = DateFormatter(dateFormat: "hh:mma")

        return "\(dateFormatter.string(from: openTime)) - \(dateFormatter.string(from: closeTime))".lowercased()
    }

    var serviceAreaPath: GMSPath {
        let service = Array(serviceArea.enumerated()).sorted { $0.offset < $1.offset }
        let coordinates = service.map { CLLocationCoordinate2D(latitude: Double($0.element.latitude), longitude: Double($0.element.longitude)) }
        let path = GMSMutablePath()
        coordinates.forEach { path.add($0) }

        return path
    }

    var serviceAreaBounds: GMSCoordinateBounds {
        return GMSCoordinateBounds(path: serviceAreaPath)
    }

    var statusLabel: String {
        #if RIDER
        return Location.getStatusLabel(
            isSuspended: self.isSuspended,
            suspendedTitle: self.suspendedTitle,
            meetsAgeRequirement: self.meetsAgeRequirement,
            failedAgeRequirementAlertTitle: self.failedAgeRequirementAlert?.title,
            locationIsOpen: self.isOpen,
            hasAppService: self.hasAppService
        )
        #elseif DRIVER
        return Location.getStatusLabel(
            isSuspended: self.isSuspended,
            suspendedTitle: self.suspendedTitle,
            meetsAgeRequirement: nil,
            failedAgeRequirementAlertTitle: nil,
            locationIsOpen: self.isOpen,
            hasAppService: self.hasAppService
        )
        #endif
    }

    var statusLabelStyle: Label.Style {
        #if RIDER
        return Location.getStatusLabelStyle(
            isSuspended: self.isSuspended,
            meetsAgeRequirement: self.meetsAgeRequirement,
            locationIsOpen: self.isOpen
        )
        #elseif DRIVER
        return Location.getStatusLabelStyle(
            isSuspended: self.isSuspended,
            meetsAgeRequirement: nil,
            locationIsOpen: self.isOpen
        )
        #endif
    }

}

struct LocationPrices: Codable {
    
    let ridePrice: Int?
    let capEnabled: Bool?
    let priceCap: Int?
    let pricePerHead: Int?
    let currency: String?
}
