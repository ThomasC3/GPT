//
//  Constants.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 25/07/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import Foundation

final class Constants {

    static let hostURL: URL = {
        if let urlString = Bundle.main.object(forInfoDictionaryKey: "Host URL") as? String,
            let url = URL(string: urlString) {
            return url
        }
        else if ProcessInfo.processInfo.arguments.contains("TEST_SUITE_DRIVER") {
            return URL(string: "https://driver.tfrholdingscorp.com/v1")!
        }
        else if ProcessInfo.processInfo.arguments.contains("TEST_SUITE_RIDER") {
            return URL(string: "https://rider.tfrholdingscorp.com/v1")!
        }

        fatalError("Info dictionary must specify a String for key \"Host URL\".")
    }()

}
