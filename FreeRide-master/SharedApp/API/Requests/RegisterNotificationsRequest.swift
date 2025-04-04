//
//  RegisterNotificationsRequest.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/19/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RegisterNotificationsRequest: Encodable {

    let deviceToken: String
    let platform = "ios"

    #if DEBUG
    let environment = "debug"
    #else
    let environment = "release"
    #endif
}
