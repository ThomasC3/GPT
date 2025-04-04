//
//  ServerAPI+Driver.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension ServerAPI {

    public func rideHail(_ request: RideHailRequest, completion: @escaping (ServiceResult<RideHailResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/hail")
        let json = request.toJSON()
        let title = "Adding ride hail"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func rideUpdate(_ request: PutRideRequest, _ query: RideQuery, completion: @escaping (ServiceResult<PutRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride")
        let queryParams = query.toJSONDictionary()
        let json = request.toJSON()
        let title = "Updating ride"
        session.startRequest(.put, url: url, query: queryParams, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func getDriver(completion: @escaping (ServiceResult<UserResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("driver")
        let title = "Fetching driver"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func updateDriver(_ request: UpdateUserRequest, completion: @escaping (ServiceResult<UpdateDriverResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("driver")
        let json = request.toJSON()
        let title = "Updating driver"
        session.startRequest(.put, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func getTips(completion: @escaping (ServiceResult<[GetTipsResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("driver/tips")
        let title = "Fetching driver tips"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getRides(query: GetRidesQuery, completion: @escaping (ServiceResult<[GetRidesResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("rides")
        let queryParams = query.toJSONDictionary()
        let title = "Fetching rides"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func getActions(completion: @escaping (ServiceResult<[GetActionsResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("actions")
        let title = "Fetching driver actions"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getDriverStatus(completion: @escaping (ServiceResult<DriverStatusResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("driver/status")
        let title = "Fetching driver status"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func postDriverStatus(request: PostDriverStatusRequest, completion: @escaping (ServiceResult<DriverStatusResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("driver/status")
        let json = request.toJSON()
        let title = "Updating driver status"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func getVehicles(query: GetVehiclesQuery, completion: @escaping (ServiceResult<[VehicleResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("vehicles")
        let queryParams = query.toJSONDictionary()
        let title = "Fetching vehicles"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func getCheckInInspection(completion: @escaping (ServiceResult<InspectionResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("vehicle/check-in")
        let title = "Preparing vehicle inspection for check in"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getCheckOutInspection(query: InspectionQuery ,completion: @escaping (ServiceResult<InspectionResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("vehicle/\(query.id)/check-out")
        let queryParams = query.toJSONDictionary()
        let title = "Preparing vehicle inspection for check out"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func postCheckInInspection(request: PostCheckInInspectionRequest, completion: @escaping (ServiceResult<DriverStatusResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("vehicle/check-in")
        let json = request.toJSON()
        let title = "Sending vehicle inspection for check in"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func postCheckOutInspection(query: InspectionQuery, request: PostCheckOutInspectionRequest, completion: @escaping (ServiceResult<DriverStatusResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("vehicle/\(query.id)/check-out")
        let json = request.toJSON()
        let title = "Sending vehicle inspection for check out"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func getLoggedInDrivers(completion: @escaping (ServiceResult<[DriverResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("drivers/logged-in")
        let title = "Fetching drivers online"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getLoggedOutDrivers(completion: @escaping (ServiceResult<OfflineDriversResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("drivers/logged-out")
        let title = "Fetching drivers offline"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func setDriverActiveLocation(_ request: SetLocationRequest, completion: @escaping (ServiceResult<SetLocationResponse>) -> Void) {
       let url = baseURL.appendingPathComponent("driver/location")
       let json = request.toJSON()
        let title = "Setting driver location"
       session.startRequest(.put, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func requestRideCancellation(query: UpdateRideQuery, request: CancelRideRequest, completion: @escaping (ServiceResult<UpdateRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/\(query.id)/cancel")
        let json = request.toJSON()
        let title = "Canceling ride"
        let recoverySuggestion = "It was not possible to cancel ride \"\(query.id)\". Please retry."
        session.startRequest(.put, url: url, requestBody: json, extraInfo: [.title: title, .recoverySuggestion: recoverySuggestion], completion: completion)
    }

    public func requestRidePickup(query: UpdateRideQuery, completion: @escaping (ServiceResult<UpdateRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/\(query.id)/pickup")
        let queryParams = query.toJSONDictionary()
        let title = "Setting \"Pickup\" state"
        let recoverySuggestion = "It was not possible to apply new state for the ride \"\(query.id)\". Please retry."
        session.startRequest(.put, url: url, query: queryParams, extraInfo: [.title: title, .recoverySuggestion: recoverySuggestion], completion: completion)
    }

    public func requestFixedStopPickup(query: UpdateRideQuery, completion: @escaping (ServiceResult<UpdateRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("fixed-stops/\(query.id)/pickup")
        let queryParams = query.toJSONDictionary()
        let title = "Setting \"Pickup\" state for fixed stop"
        let recoverySuggestion = "It was not possible to apply new state for the ride \"\(query.id)\". Please retry."
        session.startRequest(.put, url: url, query: queryParams, extraInfo: [.title: title, .recoverySuggestion: recoverySuggestion], completion: completion)
    }

    public func requestRideDropoff(query: UpdateRideQuery, completion: @escaping (ServiceResult<UpdateRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/\(query.id)/complete")
        let queryParams = query.toJSONDictionary()
        let title = "Setting \"Dropoff\" state"
        let recoverySuggestion = "It was not possible to apply new state for the ride \"\(query.id)\". Please retry."
        session.startRequest(.put, url: url, query: queryParams, extraInfo: [.title: title, .recoverySuggestion: recoverySuggestion], completion: completion)
    }

    public func requestFixedStopDropoff(query: UpdateRideQuery, completion: @escaping (ServiceResult<UpdateRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("fixed-stops/\(query.id)/complete")
        let queryParams = query.toJSONDictionary()
        let title = "Setting \"Dropoff\" state for fixed stop"
        let recoverySuggestion = "It was not possible to apply new state for the ride \"\(query.id)\". Please retry."
        session.startRequest(.put, url: url, query: queryParams, extraInfo: [.title: title, .recoverySuggestion: recoverySuggestion], completion: completion)
    }

    public func requestRideDriverArrived(query: UpdateRideQuery, completion: @escaping (ServiceResult<UpdateRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/\(query.id)/arrive")
        let queryParams = query.toJSONDictionary()
        let title = "Setting \"Arrived\" state"
        let recoverySuggestion = "It was not possible to apply new state for the ride \"\(query.id)\". Please retry."
        session.startRequest(.put, url: url, query: queryParams, extraInfo: [.title: title, .recoverySuggestion: recoverySuggestion], completion: completion)
    }

    public func requestFixedStopDriverArrived(query: UpdateRideQuery, completion: @escaping (ServiceResult<UpdateRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("fixed-stops/\(query.id)/arrive")
        let queryParams = query.toJSONDictionary()
        let title = "Setting \"Arrived\" state for fixed stop"
        let recoverySuggestion = "It was not possible to apply new state for the ride \"\(query.id)\". Please retry."
        session.startRequest(.put, url: url, query: queryParams, extraInfo: [.title: title, .recoverySuggestion: recoverySuggestion], completion: completion)
    }

}
