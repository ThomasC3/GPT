//
//  Validator.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/3/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

protocol Validator {

    var priority: Int { get }

    func isValid(_ value: String?) -> Bool
    func localizedDescription(_ value: String?, title: String?) -> String?
}
