//
//  Listener.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/15/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

protocol Listener: Codable {

    static var listener: String { get set }
}
