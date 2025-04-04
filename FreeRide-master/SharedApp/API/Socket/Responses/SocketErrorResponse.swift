//
//  SocketErrorResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/15/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct SocketErrorResponse: Listener {

    static var listener: String = "socket-error"

    let code: Int?
    let message: String
}
