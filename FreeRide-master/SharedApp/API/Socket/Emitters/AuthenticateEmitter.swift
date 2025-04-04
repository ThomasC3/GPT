//
//  AuthenticateEmitter.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/15/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct AuthenticateEmitter: Emitter {

    static var emitter: String = "authenticate"

    let token: String
}
