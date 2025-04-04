//
//  NetworkSession.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/2/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Alamofire
import OSLog

extension Session {
    typealias Handler = (_ dataResponse: AFDataResponse<Data>) -> Void

    func performRequest(_ urlRequest: URLRequest, completionHandler: @escaping Handler) {
        request(urlRequest).validate().responseData { response in
            completionHandler(response)
        }
    }
}

class NetworkSession: Session {

    // Maps a request to an object
    func startRequest<T: Decodable>(_ method: HTTPMethod, url: URL, query: [String: Any]? = nil, requestBody: Data? = nil, extraInfo: [ServiceExtraInfo: String] = [:], completion: @escaping (ServiceResult<T>) -> Void) {
        startRequest(
            method, 
            url: url,
            query: query,
            requestBody: requestBody,
            requestTitle: extraInfo[.title],
            completion: { (_ response: AFDataResponse<Data>) in
                completion(self.responseObject(from: response, extraInfo: extraInfo))
            }
        )
    }

    // Funnel point for all HTTP requests
    private func startRequest(_ method: HTTPMethod, url: URL, query: [String: Any]? = nil, requestBody: Data? = nil, requestTitle: String?, completion: @escaping (_ dataResponse: AFDataResponse<Data>) -> Void) {
        var urlRequest = URLRequest(url: url, queryParameters: query)

        Logger.api.info("API start request \(urlRequest.httpMethod!) \(urlRequest.debugDescription)")

        urlRequest.httpMethod = method.rawValue
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue(TranslationsManager.getCurrentLanguage(), forHTTPHeaderField:"Accept-Language")
        
        // App specific headers:
        urlRequest.setValue("iOS", forHTTPHeaderField: "X-Mobile-Os")
        urlRequest.setValue(Bundle.versionString, forHTTPHeaderField: "X-App-Version")
        if let requestTitle {
            urlRequest.setValue(requestTitle, forHTTPHeaderField:"X-Request-Title")
        }

        if let forgotPwdToken = Defaults.forgotPasswordAccessToken {
            urlRequest.setValue("Bearer \(forgotPwdToken)", forHTTPHeaderField: "Authorization")
        } else {
            if let accessToken = KeychainManager.shared.getAccessToken() {
                urlRequest.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            } else {
                if !url.absoluteString.contains("login") && !url.absoluteString.contains("register") {
                }
            }
        }

        if method != .get {
            urlRequest.httpBody = requestBody
        }

        performRequest(urlRequest, completionHandler: completion)
    }

    // Extracts a decodable object or an error from the response
    private func responseObject<T: Decodable>(from response: AFDataResponse<Data>, extraInfo: [ServiceExtraInfo: String] = [:]) -> ServiceResult<T> {
        #if DEBUG
        Logger.apiVerbose.debug("\(response.debugDescription)")
        #endif
        Logger.api.debug("API end request \(response.request!.httpMethod!) \(response.request!.debugDescription)")

        let networkStatusCode = response.response?.statusCode ?? 0

        if let networkError = response.error {
            switch networkError {
            case .sessionTaskFailed(let underlyingError):
                if let urlError = underlyingError as? URLError {
                    switch urlError.code {
                    case .notConnectedToInternet, .timedOut:
                        Socket.runtimeLogger?.log(.warn, "❗️ Server is not reachable: \(String(describing: networkError))")
                    default:
                        break
                    }
                }
            default:
                // Error will be handled later.
                break
            }
        }

        guard let data = response.data else {
            Logger.api.error("Decoding response data failed: no data")
            return .failure(ServiceError(AFError.responseSerializationFailed(reason: .inputDataNilOrZeroLength), extraInfo: extraInfo))
        }

        let statusIsError = networkStatusCode < 200 || networkStatusCode > 299

        let decoder = RiderAppJSONDecoder()
        do {
            let result = try decoder.decode(T.self, from: data)
            if !statusIsError {
                return .success(result)
            }
        }
        catch {
            Logger.api.critical("Decoding response data using type `\(T.self)` failed with '\((error as NSError).debugDescription)'")
        }

        if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
            // predefined error message from server
            return .failure(ServiceError(errorResponse, extraInfo: extraInfo))
        } else if let unauth = String(data: data, encoding: .utf8), unauth == "Unauthorized" {
            // unauthorized user (soon to be deprecated)
            let errorResponse = ErrorResponse(code: 401, message: "You session has expired, please log back in to continue riding!")
            return .failure(ServiceError(errorResponse, extraInfo: extraInfo))
        } else if let networkError = response.error {
            // fall back message from url session
            return .failure(ServiceError(networkError, extraInfo: extraInfo))
        } else {
            return .failure(
                ServiceError(
                    code: networkStatusCode,
                    message: "Unable to decode the response from the server.",
                    extraInfo: extraInfo + [.failureReason: "Status code: \(networkStatusCode)", .recoverySuggestion: "Please try again later or contact support if the issue persists.".localize()]
                )
            )
        }
    }
}
