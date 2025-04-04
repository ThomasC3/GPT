//
//  RiderAccessibilityUITests.swift
//  RiderAppUITests
//
//  Created by Ricardo Pereira on 15/09/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import XCTest

class RiderAccessibilityUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments.append("-disableAnimations")
        app.launch()
    }

    override func tearDown() {
    }

    // TODO

}
