//
//  ServerAPI.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

class ServerAPI {
    
    let session: NetworkSession
    let baseURL: URL

    // MARK: - Initializers

    public init(baseURL: URL = Constants.hostURL) {
        self.baseURL = baseURL
        let config = URLSessionConfiguration.af.default
        config.timeoutIntervalForRequest = 15
        config.urlCache = nil
        session = NetworkSession(configuration: config)
    }

    // MARK: - Routes

    public func login(_ request: LoginRequest, completion: @escaping (ServiceResult<LoginResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("login")
        let json = request.toJSON()
        let title = "Signing in"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func forgotPassword(_ request: ForgotPasswordRequest, completion: @escaping (ServiceResult<ForgotPasswordResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("forgot-password")
        let json = request.toJSON()
        let title = "Recovering password"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func phonePincode(_ request: PhonePincodeRequest, completion: @escaping (ServiceResult<PhonePincodeResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("phone-pincode")
        let json = request.toJSON()
        let title = "Verifying phone number"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func phoneVerify(_ request: PhoneVerifyRequest, completion: @escaping (ServiceResult<PhoneVerifyResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("phone-verify")
        let json = request.toJSON()
        let title = "Verifying phone number"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func emailVerify(_ request: EmailVerifyRequest, completion: @escaping (ServiceResult<EmailVerifyResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("forgot-password/verify")
        let json = request.toJSON()
        let title = "Verifying email"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func changePassword(_ request: ChangePasswordRequest, completion: @escaping (ServiceResult<ChangePasswordResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("change-password")
        let json = request.toJSON()
        let title = "Changing password"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func getUser(completion: @escaping (ServiceResult<UserResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("user")
        let title = "Fetching user"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getGlobalSettings(completion: @escaping (ServiceResult<GlobalSettingsResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("global-settings")
        let title = "Fetching settings"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getLocation(_ query: LocationQuery, completion: @escaping (ServiceResult<LocationResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("locations/\(query.id)")
        let title = "Fetching location"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getLocations(_ query: GetLocationsQuery, completion: @escaping (ServiceResult<[LocationResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("locations")
        let queryParams = query.toJSONDictionary()
        let title = "Fetching locations"
        let recoverySuggestion = "Please check your connection and try again later. If the issue persists, contact support with the error details."
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title, .recoverySuggestion: recoverySuggestion], completion: completion)
    }

    public func getRide(_ query: RideQuery, completion: @escaping (ServiceResult<RideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("rides/\(query.id)")
        let title = "Fetching rides"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func rateRide(_ request: RateRideRequest, completion: @escaping (ServiceResult<RateRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/rating")
        let json = request.toJSON()
        let title = "Rating ride"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func reportRide(request: ReportRideRequest, completion: @escaping (ServiceResult<ReportRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("report")
        let json = request.toJSON()
        let title = "Reporting ride"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func getRideStatus(_ request: RideStatusRequest, completion: @escaping (ServiceResult<RideStatusResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("rides/\(request.ride)/status")
        let title = "Fetching ride status"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func registerNotifications(_ request: RegisterNotificationsRequest, completion: @escaping (ServiceResult<RegisterNotificationsResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("notifications")
        let json = request.toJSON()
        let title = "Registering for push notifications"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func deleteNotifications(_ request: DeleteNotificationsRequest, completion: @escaping (ServiceResult<DeleteNotificationsResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("notifications")
        let json = request.toJSON()
        let title = "Unregistering for push notifications"
        session.startRequest(.delete, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func logout(request: LogoutRequest, completion: @escaping (ServiceResult<LogoutResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("logout")
        let json = request.toJSON()
        let title = "Signing out"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

}
