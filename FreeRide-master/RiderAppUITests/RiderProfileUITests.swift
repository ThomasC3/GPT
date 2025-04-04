//
//  RiderProfileUITests.swift
//  RiderAppUITests
//
//  Created by Ricardo Pereira on 15/09/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import XCTest

class RiderProfileUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments.append("-disableAnimations")
        app.launch()
    }

    override func tearDown() {
    }

    func test01_Profile_should_present_information_of_the_current_user() {
        let app = XCUIApplication()

        if app.buttons["signUpButton"].exists {
            RiderSignInUITests.loginWithRiderTester(app: app)
        }

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        XCTAssertFalse(app.alerts.element.exists)

        let menuButton = app.buttons["menuNavigationButton"]
        menuButton.waitForExistence()
        menuButton.tap()

        let tablesQuery = app.tables

        let menuItem = tablesQuery.staticTexts["Edit Profile"]
        menuItem.waitForExistence()
        menuItem.tap()

        let subtitleLabel = app.staticTexts["subtitleLabel"]
        subtitleLabel.waitForExistence()
        XCTAssertTrue(subtitleLabel.exists)
        XCTAssertEqual(subtitleLabel.label, "Email: \(secretRiderTesterEmail)")

        // TODO: check remaining fields!

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        XCTAssertFalse(app.alerts.element.exists)
    }

}
