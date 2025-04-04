//
//  Location.swift
//  Circuit
//
//  Created by Andrew Boryk on 1/5/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import CoreData
import GoogleMaps
import Foundation

class Location: NSManagedObject {

    @NSManaged var id: String
    @NSManaged var name: String
    @NSManaged var closedCopy: String
    @NSManaged var inactiveCopy: String
    @NSManaged var isActive: Bool
    @NSManaged var isADA: Bool
    @NSManaged var isUsingServiceTimes: Bool
    @NSManaged var serviceHours: Set<ServiceHours>
    @NSManaged var serviceArea: Set<Coordinate>
    
    @NSManaged var isSuspended: Bool
    @NSManaged var hasAppService: Bool
    @NSManaged var suspendedCopy : String
    @NSManaged var suspendedTitle : String
    @NSManaged var isOpen : Bool
    @NSManaged var fleetEnabled : Bool
    
    #if RIDER
    @NSManaged var poolingEnabled: Bool
    @NSManaged var showAlert: Bool
    @NSManaged var alertTitle: String?
    @NSManaged var alertCopy: String?
    @NSManaged var pwywCopy: String?
    @NSManaged var paymentEnabled: Bool
    @NSManaged var pwywEnabled: Bool
    @NSManaged var pwywMaxCustomValue: Int32
    @NSManaged var pwywCurrency: String
    @NSManaged var pwywOptions: [NSNumber]
    @NSManaged var tipEnabled: Bool
    @NSManaged var tipMaxCustomValue: Int32
    @NSManaged var tipCurrency: String
    @NSManaged var tipOptions: [NSNumber]
    @NSManaged var riderPickupDirections: Bool
    @NSManaged var riderAgeRequirement: Int32
    @NSManaged var meetsAgeRequirement: Bool
    @NSManaged var ageRequirementTitle: String
    @NSManaged var ageRequirementCopy: String
    
    #elseif DRIVER
    @NSManaged var blockLiveDriverLocation : Bool
    @NSManaged var driverLocationUpdateInterval : Int32
    @NSManaged var breakDurations: [NSNumber]
    #endif

    struct Defaults {
        static let isSuspended = false
        static let hasAppService = true
        static let suspendedTitle = ""
        static let suspendedCopy = ""
        static let meetsAgeRequirement = true
        static let failedAgeRequirementAlertTitle = ""
        static let failedAgeRequirementAlertCopy = ""
        static let fixedStopEnabled = false
        static let fleetEnabled = false
        static let currency = "usd"
    }

    func update(with response: LocationResponse) {
        id = response.id
        name = response.name
        closedCopy = response.closedCopy
        inactiveCopy = response.inactiveCopy
        isActive = response.isActive
        isADA = response.isADA
        isOpen = response.isOpen
        isUsingServiceTimes = response.isUsingServiceTimes

        isSuspended = response.isSuspended ?? Defaults.isSuspended
        hasAppService = response.hasAppService ?? Defaults.hasAppService
        suspendedCopy = response.suspendedCopy ?? Defaults.suspendedCopy
        suspendedTitle = response.suspendedTitle ?? Defaults.suspendedTitle
        fleetEnabled = response.fleetEnabled ?? Defaults.fleetEnabled
        
        #if RIDER
        poolingEnabled = response.poolingEnabled ?? true
        showAlert = response.showAlert ?? false
        alertTitle = response.alert?.title
        alertCopy = response.alert?.copy
        pwywCopy = response.pwywCopy
        paymentEnabled = response.paymentEnabled ?? false
        pwywEnabled = response.pwywEnabled ?? false
        pwywMaxCustomValue = Int32(response.pwywInformation?.maxCustomValue ?? 0)
        pwywCurrency = response.pwywInformation?.currency ?? Defaults.currency
        pwywOptions = (response.pwywInformation?.pwywOptions ?? [] ) as [NSNumber]
        tipEnabled = response.tipEnabled ?? true
        tipMaxCustomValue = Int32(response.tipInformation?.maxCustomValue ?? 0)
        tipCurrency = response.tipInformation?.currency ?? Defaults.currency
        tipOptions = (response.tipInformation?.tipOptions ?? []) as [NSNumber]
        riderPickupDirections = response.riderPickupDirections ?? false
        riderAgeRequirement = Int32(response.riderAgeRequirement ?? -1)
        meetsAgeRequirement = response.meetsAgeRequirement ?? Defaults.meetsAgeRequirement
        ageRequirementTitle = response.failedAgeRequirementAlert?.title ?? Defaults.failedAgeRequirementAlertTitle
        ageRequirementCopy = response.failedAgeRequirementAlert?.copy ?? Defaults.failedAgeRequirementAlertCopy
        #elseif DRIVER
        blockLiveDriverLocation = response.blockLiveDriverLocation ?? false
        driverLocationUpdateInterval = Int32(response.driverLocationUpdateInterval ?? 10)
        breakDurations = (response.breakDurations ?? []) as [NSNumber]
        #endif

        guard let ctx = managedObjectContext else {
            return
        }

        ctx.wipeLocationDetails()

        serviceHours = Set(response.serviceHours.map {
            let hours = ServiceHours(context: ctx)
            hours.update(with: $0)
            hours.location = self
            return hours
        })

        serviceArea = Set(response.serviceArea.enumerated().map { (index, service) in
            let coordinate = Coordinate(context: ctx)
            coordinate.update(with: service, index: index)
            coordinate.location = self
            return coordinate
        })
        
        ctx.saveContext()
    }
        
    var statusLabel: String {
        #if RIDER
        return Location.getStatusLabel(
            isSuspended: self.isSuspended,
            suspendedTitle: self.suspendedTitle,
            meetsAgeRequirement: self.meetsAgeRequirement,
            failedAgeRequirementAlertTitle: self.ageRequirementTitle,
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
    
    var canAcceptRequests: Bool {
        #if RIDER
        return !isSuspended && hasAppService && locationIsOpen && meetsAgeRequirement
        #elseif DRIVER
        return !isSuspended && hasAppService && locationIsOpen
        #endif
    }
    
    var statusCopy: String {
        if !isSuspended {
            #if RIDER
            if !meetsAgeRequirement {
                return ageRequirementCopy
            }
            #endif
            if locationIsOpen && !hasAppService {
                return "App Request service is not available at this location. Flag down a car to catch a ride!".localize()
            } else {
                return closedCopy
            }
        }
        return suspendedCopy
    }
    
    var locationIsOpen: Bool {
       return isOpen
    }

    var serviceAreaPath: GMSPath {
        let service = Array(serviceArea).sorted { $0.index < $1.index }
        let coordinates = service.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) }
        let path = GMSMutablePath()
        coordinates.forEach { path.add($0) }

        return path
    }

    var serviceAreaBounds: GMSCoordinateBounds {
        return GMSCoordinateBounds(path: serviceAreaPath)
    }
    
    var requiresPayment: Bool {
        #if RIDER
        return paymentEnabled
        #elseif DRIVER
        return false
        #endif
    }
    
    var requiresPwywMinPayment: Bool {
        #if RIDER
        return pwywBaseValue > 0 && self.pwywEnabled
        #elseif DRIVER
        return false
        #endif
    }
    
    var pwywBaseValue: Int {
        #if RIDER
        if pwywOptions.count == 3 {
            return Int(truncating: pwywOptions[0])
        } else {
            return 0
        }
        #elseif DRIVER
        return 0
        #endif
    }
        
    static func day(forTag tag: Int) -> String {
        switch tag {
        case 2:
            return "Monday".localize()
        case 3:
            return "Tuesday".localize()
        case 4:
            return "Wednesday".localize()
        case 5:
            return "Thursday".localize()
        case 6:
            return "Friday".localize()
        case 7:
            return "Saturday".localize()
        case 1:
            return "Sunday".localize()
        default:
            return " "
        }
    }

    static func getStatusLabel(isSuspended: Bool?, suspendedTitle: String?, meetsAgeRequirement: Bool?, failedAgeRequirementAlertTitle: String?, locationIsOpen: Bool, hasAppService: Bool?) -> String {
        if !(isSuspended ?? Defaults.isSuspended) {
            //from here all locations are marked as ACTIVE
            #if RIDER
            if !(meetsAgeRequirement ?? Defaults.meetsAgeRequirement) {
                return failedAgeRequirementAlertTitle ?? Defaults.failedAgeRequirementAlertTitle
            }
            #endif

            if locationIsOpen {
                return (hasAppService ?? Defaults.hasAppService) ? "Open Now".localize() : "Open Without App Service".localize()
            } else {
                return "Closed Now".localize()
            }
        }

        return suspendedTitle ?? Defaults.suspendedTitle
    }

    static func getStatusLabelStyle(isSuspended: Bool?, meetsAgeRequirement: Bool?, locationIsOpen: Bool) -> Label.Style {
        if !(Defaults.isSuspended) {
            //from here all locations are marked as ACTIVE
            #if RIDER
            if !(meetsAgeRequirement ?? true) {
                return .subtitle1lightred
            }
            #endif

            return locationIsOpen ? .subtitle1teal : .subtitle1lightred
        }
        return .subtitle1gray
    }

}
