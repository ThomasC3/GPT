//
//  AppleAuthRequest.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 08/08/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import Foundation

struct AppleAuthRequest: Codable {

    let identityToken: String
    let firstName: String
    let lastName: String
}
