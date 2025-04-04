//
//  Connectivity.swift
//  FreeRide
//

import Alamofire

struct Connectivity {
    
    static let sharedManager = NetworkReachabilityManager(host: getUrlWithoutScheme(url: Constants.hostURL))!
    //static let sharedGeneralManager =  NetworkReachabilityManager()!
    
    static func getUrlWithoutScheme(url : URL) -> String {
        return url.absoluteString.replacingOccurrences(of: "https://", with: "").replacingOccurrences(of: "/v1", with: "")
    }
    
    static var reportsToSend : [String] = []
}
