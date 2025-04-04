//
//  RiderSignInUITests.swift
//  RiderAppUITests
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Circuit. All rights reserved.
//

import XCTest

class RiderSignInUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments.append("-disableAnimations")
        app.launch()
    }

    override func tearDown() {
    }

    static func loginWithRiderTester(app: XCUIApplication) {
        let walkthroughSignInButton = app.buttons["signInButton"]
        walkthroughSignInButton.tap()

        let emailTextField = app.textFields["emailTextField"]
        emailTextField.waitForExistence()
        emailTextField.tap()
        emailTextField.typeText(secretRiderTesterEmail)

        let passwordTextField = app.secureTextFields["passwordTextField"]
        passwordTextField.tap()
        passwordTextField.typeText(secretRiderTesterPassword)
        // Hide keyboard
        passwordTextField.keyboardReturn()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()
    }

    func test01_SignIn_should_succeed() {
        Self.loginWithRiderTester(app: app)

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        if app.alerts.element.exists {
            XCTAssert(app.alerts.element.staticTexts["Failed to retrieve lat and lng from users zip"].exists)
            app.alerts.element.buttons["Ok"].tap()
        }
    }

    func test02_SignOut_should_succeed() {
        let app = XCUIApplication()
        let menuButton = app.buttons["menuNavigationButton"]
        menuButton.waitForExistence()
        menuButton.tap()

        let tablesQuery = app.tables

        let logoutMenuItem = tablesQuery.staticTexts["Log Out"]
        logoutMenuItem.waitForExistence()
        logoutMenuItem.tap()

        let logOutAlert = app.alerts["Ready to Log Out?"]
        logOutAlert.waitForExistence()
        logOutAlert.scrollViews.otherElements.buttons["Yes"].tap()

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        XCTAssertFalse(app.alerts.element.exists)
    }

    func test03_SignIn_should_fail_with_email_is_required() {
        let app = XCUIApplication()
        let walkthroughSignInButton = app.buttons["signInButton"]
        walkthroughSignInButton.tap()

        let emailTextField = app.textFields["emailTextField"]
        emailTextField.waitForExistence()
        emailTextField.tap()
        emailTextField.typeText("     ")

        // Hide keyboard
        emailTextField.keyboardReturn()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Email is required"].exists)
    }

    func test04_SignIn_should_fail_with_invalid_email() {
        let app = XCUIApplication()
        let walkthroughSignInButton = app.buttons["signInButton"]
        walkthroughSignInButton.tap()

        let emailTextField = app.textFields["emailTextField"]
        emailTextField.waitForExistence()
        emailTextField.tap()
        emailTextField.typeText("a@b")

        // Hide keyboard
        emailTextField.keyboardReturn()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Email address is not valid"].exists)
    }

    func test05_SignIn_should_fail_with_password_is_required() {
        let app = XCUIApplication()
        let walkthroughSignInButton = app.buttons["signInButton"]
        walkthroughSignInButton.tap()

        let emailTextField = app.textFields["emailTextField"]
        emailTextField.waitForExistence()
        emailTextField.tap()
        emailTextField.typeText("a@b.com")

        // Hide keyboard
        emailTextField.keyboardReturn()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Password is required"].exists)
    }

}
