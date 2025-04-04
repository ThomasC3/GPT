//
//  Ride.swift
//  RiderApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

class Ride: RideBase {

    @NSManaged var driverName: String
    @NSManaged var originAddress: String
    @NSManaged var destinationAddress: String
    @NSManaged var originFixedStopId: String?
    @NSManaged var destinationFixedStopId: String?
    @NSManaged var isRated: Bool
    @NSManaged var paymentStatus: String?
    @NSManaged var totalPrice: Int32
    @NSManaged var discount: Int32
    @NSManaged var totalWithoutDiscount: Int32
    @NSManaged var currency: String?
    @NSManaged var tipTotal: Int32
    @NSManaged var tipCurrency: String?
    @NSManaged var rating: Int32
    @NSManaged var licensePlate: String?
    @NSManaged var driverPhoto: String?

    var originAddressShort: String? {
        return originAddress.components(separatedBy: ",").first
    }

    var destinationAddressShort: String? {
        return destinationAddress.components(separatedBy: ",").first
    }

    func update(with response: RequestCompleted) {
        id = response.id
        driverName = response.driverName
        originAddress = response.origin.address
        originLatitude = response.origin.latitude
        originLongitude = response.origin.longitude
        destinationAddress = response.destination.address
        destinationLatitude = response.destination.latitude
        destinationLongitude = response.destination.longitude
        originFixedStopId = response.origin.fixedStopId
        destinationFixedStopId = response.destination.fixedStopId
        isADA = response.isADA
        statusValue = Int32(response.status)
        createdTimestamp = response.createdTimestamp
        licensePlate = response.licensePlate
        driverPhoto = response.driverPhoto
    }

    func update(with response: RideUpdatesResponse) {
        statusValue = Int32(response.status)
        paymentStatus = response.paymentStatus
        currency = response.currency
        driverArrivedTimestamp = response.driverArrivedTimestamp?.utcStringToDate()
        if let valPrice = response.totalPrice {
            totalPrice = Int32(valPrice)
        }
        if let valDiscount = response.discount {
            discount = Int32(valDiscount)
        }
        if let valPriceWithoutDiscount = response.totalWithoutDiscount {
            totalWithoutDiscount = Int32(valPriceWithoutDiscount)
        }
    }
    
    func update(with response: RideResponse) {
        id = response.id
        driverName = response.driverName
        originAddress = response.origin.address
        originLatitude = response.origin.latitude
        originLongitude = response.origin.longitude
        destinationAddress = response.destination.address
        destinationLatitude = response.destination.latitude
        destinationLongitude = response.destination.longitude
        originFixedStopId = response.origin.fixedStopId
        destinationFixedStopId = response.destination.fixedStopId
        createdTimestamp = Date()
        isADA = false
        passengers = Int32(response.passengers)
        statusValue = Int32(response.status)
        isRated = response.rating != nil
        paymentStatus = response.paymentStatus
        currency = response.currency
        if let valPrice = response.totalPrice {
            totalPrice = Int32(valPrice)
        }
        if let valDiscount = response.discount {
            discount = Int32(valDiscount)
        }
        if let valPriceWithoutDiscount = response.totalWithoutDiscount {
            totalWithoutDiscount = Int32(valPriceWithoutDiscount)
        }
        if let valTipTotal = response.tipTotal {
            tipTotal = Int32(valTipTotal)
        }
        if let valRating = response.rating {
            rating = Int32(valRating)
        }
        tipCurrency = response.tipCurrency
        driverArrivedTimestamp = response.driverArrivedTimestamp?.utcStringToDate()
        licensePlate = response.licensePlate
        driverPhoto = response.driverPhoto
    }
    
    static func getRidePaymentsDetails(totalPrice: Int?, discount: Int?, totalWithoutDiscount: Int?, currency: String?) -> String {
        
        var priceToShow = ""
        
        guard let currency = currency, let totalPrice = totalPrice else {
            return priceToShow
        }
        
        priceToShow = totalPrice.toPrice(with: currency)
        
        if let discount = discount, discount > 0 {
            priceToShow += ", \("payments_including".localize()) \(discount.toPrice(with: currency)) \("payments_of_discount".localize())"
        }
        
        return priceToShow
        
    }
}
