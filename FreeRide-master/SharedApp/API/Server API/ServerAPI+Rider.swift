//
//  ServerAPI+Rider.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension ServerAPI {

    public func authGoogle(_ request: GoogleAuthRequest, completion: @escaping (ServiceResult<UserResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("auth/google")
        let json = request.toJSON()
        let title = "Google Auth"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func authApple(_ request: AppleAuthRequest, completion: @escaping (ServiceResult<UserResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("auth/apple")
        let json = request.toJSON()
        let title = "Apple Auth"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func register(_ request: RegisterRequest, completion: @escaping (ServiceResult<UserResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("register")
        let json = request.toJSON()
        let title = "Registering user"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }
 
    public func getAddresses(_ query: GetAddressesQuery, completion: @escaping (ServiceResult<[GetAddressesResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("address")
        let queryParams = query.toJSONDictionary()
        let title = "Fetching address"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func requestRide(_ request: RequestRideRequest, completion: @escaping (ServiceResult<RequestRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/request")
        let json = request.toJSON()
        let title = "Requesting ride"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func cancelRequestRide(completion: @escaping (ServiceResult<CancelRequestRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/request/cancel")
        let title = "Canceling ride request"
        session.startRequest(.post, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func confirmRequestRide(_ request: ConfirmRequestRideRequest, completion: @escaping (ServiceResult<ConfirmRequestRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/request/confirm")
        let json = request.toJSON()
        let title = "Confirming ride request"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func validateRequestRide(completion: @escaping (ServiceResult<RequestRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("ride/request/payment-authorization")
        let title = "Validating ride request"
        session.startRequest(.post, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getRideRequests(completion: @escaping (ServiceResult<[RequestRideResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("requests")
        let queryParams = ["status" : 100]
        let title = "Fetching ride requests"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func getRides(completion: @escaping (ServiceResult<[RideResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("rides")
        let title = "Fetching rides"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getLastCompletedRide(completion: @escaping (ServiceResult<[RideResponse]>) -> Void) {
        let url = baseURL.appendingPathComponent("rides")
        let queryParams = ["limit" : 1]
        let title = "Fetching last ride"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func getCurrentRide(completion: @escaping (ServiceResult<RideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("current-ride")
        let title = "Fetching current ride"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getPaymentSettings(_ query: LocationIdQuery, completion: @escaping (ServiceResult<PaymentSettingsResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("payment-settings")
        let queryParams = query.toJSONDictionary()
        let title = "Fetching payment settings"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func requestPaymentSetup(completion: @escaping (ServiceResult<PaymentSetupResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("payment-settings/setup")
        let title = "Setting up payment method"
        session.startRequest(.post, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func removePaymentMethod(_ query: LocationIdQuery, completion: @escaping (ServiceResult<PaymentSettingsResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("payment-settings/setup")
        let queryParams = query.toJSONDictionary()
        let title = "Removing payment method"
        session.startRequest(.delete, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func requestPaymentIntent(completion: @escaping (ServiceResult<PaymentIntentResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("payment/create")
        let title = "Creating payment intent"
        session.startRequest(.post, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func requestPaymentCapture(_ request: PaymentCaptureRequest, completion: @escaping (ServiceResult<PaymentCaptureResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("payment/capture")
        let json = request.toJSON()
        let title = "Creating payment capture"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func getQuote(_ query: QuoteQuery, completion: @escaping (ServiceResult<PaymentInformation>) -> Void) {
        let url = baseURL.appendingPathComponent("quote")
        let queryParams = query.toJSONDictionary()
        let title = "Fetching quote"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func requestTipIntent(_ request: TipRequest, completion: @escaping (ServiceResult<TipIntentResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("tip")
        let json = request.toJSON()
        let title = "Adding tip"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func requestTipConfirmation(_ request: ConfirmRequestRideRequest, completion: @escaping (ServiceResult<ConfirmRequestRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("tip/confirm")
        let json = request.toJSON()
        let title = "Confirming tip"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func requestTipCancelation(_ request: TipCancelationRequest, completion: @escaping (ServiceResult<CancelRequestRideResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("tip/cancel")
        let json = request.toJSON()
        let title = "Canceling tip"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func addPromocode(_ request: PromocodeRequest, completion: @escaping (ServiceResult<PaymentSettingsResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("promocode")
        let json = request.toJSON()
        let title = "Adding promocode"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func removePromocode(completion: @escaping (ServiceResult<PaymentSettingsResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("promocode")
        let title = "Removing promocode"
        session.startRequest(.delete, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func getStopType(_ query: StopTypeQuery, completion: @escaping (ServiceResult<StopTypeResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("stop")
        let queryParams = query.toJSONDictionary()
        let title = "Fetching stops"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func updateUser(_ request: UpdateUserRequest, completion: @escaping (ServiceResult<UserResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("user")
        let json = request.toJSON()
        let title = "Updating user"
        session.startRequest(.put, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func updateUserLocale(_ request: UpdateLocaleRequest, completion: @escaping (ServiceResult<UpdateUserResponse>) -> Void) {
       let url = baseURL.appendingPathComponent("user")
       let json = request.toJSON()
        let title = "Updating user locale"
       session.startRequest(.put, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func deleteUser(completion: @escaping (ServiceResult<LogoutResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("user")
        let title = "Deleting user"
        session.startRequest(.delete, url: url, extraInfo: [.title: title], completion: completion)
    }

    public func requestEmailVerification(request: EmailVerificationReqRequest?, completion: @escaping (ServiceResult<EmailVerificationRequestResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("send-email-verification")
        let json = request != nil ? request.toJSON() : nil
        let title = "Requesting email verification"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func verifyEmail(request: EmailVerificationRequest?, completion: @escaping (ServiceResult<EmailVerificationResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("email-verify")
        let json = request.toJSON()
        let title = "Verifying email"
        session.startRequest(.post, url: url, requestBody: json, extraInfo: [.title: title], completion: completion)
    }

    public func getPaymentInformation(locationId: String, query: LocationPaymentInfoQuery, completion: @escaping (ServiceResult<LocationPaymentInfoResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("location/\(locationId)/payment-information")
        let queryParams = query.toJSONDictionary()
        let title = "Fetching location payment information"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

    public func getFlux(locationId: String, completion: @escaping (ServiceResult<FluxResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("location/\(locationId)/flux")
        let title = "Fetching location service status"
        session.startRequest(.get, url: url, extraInfo: [.title: title], completion: completion)
    }
    
    public func getMedia(_ query: MediaQuery, completion: @escaping (ServiceResult<MediaResponse>) -> Void) {
        let url = baseURL.appendingPathComponent("media")
        let queryParams = query.toJSONDictionary()
        let title = "Fetching media"
        session.startRequest(.get, url: url, query: queryParams, extraInfo: [.title: title], completion: completion)
    }

}
