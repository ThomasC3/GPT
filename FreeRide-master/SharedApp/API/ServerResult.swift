//
//  ServerResult.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/2/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

enum ServiceResult<T> {

    case success(T)
    case failure(ServiceError)
}

struct ServiceError: LocalizedError {

    enum HTTPStatusCode: Int {

        case unknown = 0

        // 100 Informational
        case `continue` = 100
        case switchingProtocols
        case processing

        // 200 Success
        case ok = 200
        case created = 201
        case accepted = 202
        case nonAuthoritativeInformation = 203
        case noContent = 204
        case resetContent = 205
        case partialContent = 206
        case multiStatus = 207
        case alreadyReported = 208
        case iMUsed = 226

        // 300 Redirection
        case multipleChoices = 300
        case movedPermanently = 301
        case found = 302
        case seeOther = 303
        case notModified = 304
        case useProxy = 305
        case switchProxy = 306
        case temporaryRedirect = 307
        case permanentRedirect = 308

        // 400 Client Error
        case badRequest = 400
        case unauthorized = 401
        case paymentRequired = 402
        case forbidden = 403
        case notFound = 404
        case methodNotAllowed = 405
        case notAcceptable = 406
        case proxyAuthenticationRequired = 407
        case requestTimeout = 408
        case conflict = 409
        case gone = 410
        case lengthRequired = 411
        case preconditionFailed = 412
        case payloadTooLarge = 413
        case uriTooLong = 414
        case unsupportedMediaType = 415
        case rangeNotSatisfiable = 416
        case expectationFailed = 417
        case imATeapot = 418
        case misdirectedRequest = 421
        case unprocessableEntity = 422
        case locked
        case failedDependency
        case upgradeRequired = 426
        case preconditionRequired = 428
        case tooManyRequests
        case requestHeaderFieldsTooLarge = 431
        case unavailableForLegalReasons = 451

        // 500 Server Error
        case internalServerError = 500
        case notImplemented
        case badGateway
        case serviceUnavailable
        case gatewayTimeout
        case httpVersionNotSupported
        case variantAlsoNegotiates
        case insufficientStorage
        case loopDetected
        case notExtended = 510
        case networkAuthenticationRequired
    }

    private let code: Int
    private let message: String
    private var extraInfo: [ServiceExtraInfo: String]

    init(_ error: Error, extraInfo: [ServiceExtraInfo: String] = [:]) {
        let nsError = error as NSError
        self.code = nsError.code
        self.message = error.localizedDescription
        self.extraInfo = extraInfo
        if self.extraInfo[.failureReason] == nil {
            self.extraInfo[.failureReason] = nsError.domain
        }
    }

    init(_ response: ErrorResponse, extraInfo: [ServiceExtraInfo: String] = [:]) {
        self.code = Int(response.code ?? "") ?? 0
        self.message = response.message
        self.extraInfo = extraInfo
    }

    init(code: Int, message: String, extraInfo: [ServiceExtraInfo: String] = [:]) {
        self.code = code
        self.message = message
        self.extraInfo = extraInfo
    }

    var localizedDescription: String {
        return message
    }

    var errorDescription: String? {
        var description = localizedDescription

        if let failureReason {
            description += " (\(failureReason))"
        }
        if let recoverySuggestion {
            description += "\n\n\(recoverySuggestion)"
        }

        return description
    }

    var status: HTTPStatusCode {
        return HTTPStatusCode(rawValue: code) ?? .unknown
    }

    // MARK: - `LocalizedError` properties

    var failureReason: String? {
        return extraInfo[.failureReason]
    }

    var recoverySuggestion: String? {
        return extraInfo[.recoverySuggestion]
    }

    var helpAnchor: String? {
        return extraInfo[.title]
    }

}

struct ServiceUnexpectedError: LocalizedError {

    let message: String

    var errorDescription: String? {
        return message
    }

}
