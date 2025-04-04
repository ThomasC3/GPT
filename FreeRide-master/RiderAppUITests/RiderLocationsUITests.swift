//
//  RiderLocationsUITests.swift
//  RiderAppUITests
//
//  Created by Ricardo Pereira on 15/09/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import XCTest

class RiderLocationsUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments.append("-disableAnimations")
        app.launch()
    }

    override func tearDown() {
    }

    func test01_Locations_should_be_able_to_change_location_from_the_list() {
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

        let menuItem = tablesQuery.staticTexts["Locations"]
        menuItem.waitForExistence()
        menuItem.tap()

        let locationItem = tablesQuery.staticTexts["Coimbra"]
        locationItem.waitForExistence()
        XCTAssertTrue(locationItem.exists)
        locationItem.tap()

        let mapLocationsButton = app.buttons["locationsNavigationButton"]
        mapLocationsButton.waitForExistence()
        let titleNavigationLabel = app.staticTexts["homeTitleLabel"]
        XCTAssertEqual(titleNavigationLabel.label, "Coimbra")

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        XCTAssertFalse(app.alerts.element.exists)
    }

}
