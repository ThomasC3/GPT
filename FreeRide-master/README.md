# Ride & Driver Circuit apps for iOS

<a href="https://github.com/thefreerideinc/FreeRide/actions">
  <img src="https://github.com/thefreerideinc/FreeRide/workflows/TestSuite/badge.svg" />
</a>

## Getting Started

### Requirements

 - iOS 12.0 or later
 - Xcode 13.0+ (Swift 5)

### Initial setup

1. Install [CocoaPods](https://github.com/CocoaPods/CocoaPods) (v1.11.0 or greater) and run `pod install`.
2. This project has some frameworks stored in a **Git LFS (Large File Storage)**. You will need to have the Git LFS command-line client installed, or a Git LFS aware GUI client, to be able to pull the frameworks from the storage.
3. Duplicate the `SharedApp/Secrets.swift.example` file and rename it to `Secrets.swift`. Set the necessary secret keys.
4. Open the `FreeRide.xcworkspace` file.

### Run apps in the simulator

There's a Wiki explaining how to run the apps locally: [Running apps in Xcode Simulator](https://github.com/thefreerideinc/FreeRide/wiki/Running-apps-in-Xcode-Simulator).

## Test Suite

There are integration tests and UI tests for the Rider app. Begin by writing integration tests first, but if they are insufficient for thoroughly testing the desired functionality, move on to creating UI tests.

The test suite runs against the **Staging** server.

### Unit/Integration Tests

> ⚠️ To be able to run the Driver tests in your machine, set the `secretDriverTesterEmail` and `secretDriverTesterPassword` variables in the `SharedApp/Secrets.swift` file.

You can run the test suite using Fastlane. Be sure you have [`Fastlane`](https://github.com/fastlane/fastlane) installed in your machine.

You are able to run the integration tests by executing the `run_integration_tests` lane:

```
fastlane run_integration_tests
```

You can also run the integration tests in Xcode by selecting the appropriate test target:

* RiderAppTests
* DriverAppTests

#### CI / Github Actions

There's a [Github Action file](https://github.com/thefreerideinc/FreeRide/actions/workflows/build.yml) designed to automate the process of running tests. The current workflow runs the existing unit & integration tests. It is triggered by either a push event to the "develop" branch, a pull request that is ready for review, or manually through the [Actions tab](https://github.com/thefreerideinc/FreeRide/actions). 

The action file runs on a macOS environment. The action uses the Github Action Cache to speed up the build process by caching the CocoaPods and Swift Package Manager dependencies. It uses `xcodebuild` to build and test the `RiderApp-Stage` and `DriverApp-Stage` schemes. 

If the build and tests are successful, the action will report a success. If any tests fail or the build is unsuccessful, the action will report a failure and provide details on which tests failed and why.

#### Disclaimer

⚠️ It is important to note that current tests may not have full or optimal coverage of the codebase. However, they provide a baseline for future unit & integration tests and can help catch build errors. As the codebase evolves, it is recommended to regularly review and update the test suite to ensure comprehensive coverage and accuracy. By doing so, future integration tests can be built on top of a strong foundation of unit tests, which can help ensure the reliability of the codebase.

### UI Tests

Please check the [Circuit Mobile UI Testing Guide](https://ridecircuit.atlassian.net/l/cp/38eoE0Ke). This guide covers the complete process for setting up and running UI tests.

#### TL;DR

Run the scripts in the root folder of the project.

**Driver**

```sh
maestro test -e USERNAME=<driver_username> -e PASSWORD=<driver_password> maestro/DriverUITests.yaml
```


**Rider**

```sh
maestro test -e USERNAME=<rider_username> -e PASSWORD=<driver_password> maestro/RiderUITests.yaml
```

**Request Flow**

Requirements:

 - The script requires `secrets.sh` configuration file for Driver app authentication.
 - Start an iOS simulator for the Driver app and an Android emulator for the Rider app.
 - Driver app must be running in the iOS simulator without an account (logged out).
 - Rider app must be running in the Android emulator with a Rider account, ready to do requests.
 - Driver must use an account that is assigned to the "Lisboa", "Lisboa - Parque das Nações (Fixed Price)" and "Lisboa - Benfica (PWYW)" locations.
 - Run the script in the root folder of the project (`Freeride-iOS`).

```sh
./maestro/request_flow/RequestFlowUITests.sh --riderDeviceID emulator-5554 --driverDeviceID CAFFA9A5-D6AC-4595-A491-B0DD23719FBB
```

Parameters:

 - `riderDeviceID` - Android Emulator identifier for the Rider app.
 - `driverDeviceID` - iOS Simulator identifier for the Driver app.

How to get the identifier of the booted iOS simulator:

```
$  ~ xcrun simctl getenv booted SIMULATOR_UDID
CAFFA9A5-D6AC-4595-A491-B0DD23719FBB
```

The UDID of the booted simulator is `CAFFA9A5-D6AC-4595-A491-B0DD23719FBB`

How to get the identifier of the booted Android emulator:

```
$  ~ adb devices

List of devices attached
emulator-5554	 device
```

The id of the booted emulator is `emulator-5554`.


## Version Releases

#### Bump version

Arguments:

 - `bump_type`: `major`, `minor` or `patch`.

Example:

```
fastlane bump_version_driver bump_type:patch
```

Check all [available lanes](fastlane/README.md).

#### Build a release

⚠️ Note: do your **first build manually on Xcode** to update your certificates.

Arguments:

 - `username `: Apple ID username.

Example:

```
fastlane beta_rider_staging username:ricardopereira@whitesmith.co
```

or

```
fastlane release_rider username:ricardopereira@whitesmith.co
```

Check all [available lanes](fastlane/README.md).

## Development Process

In this repo the `master` branch contains the latest stable version of the app. Pushing changes to the `master` branch is locked. All the development (bug fixing, feature implementation, etc.) is done against the `develop` branch, which you should branch from whenever you'd like to make modifications. Here's the steps to follow when contributing to this repo:

1. Setup or update your machine
2. Create your feature/bugfix branch from **`develop`** (`git checkout develop && git checkout -b my-new-feature-branch`)
3. Commit your changes
4. Ensure you have added **suitable tests** and the **test suite is passing**
5. Push to the branch (`git push origin my-new-feature-branch`)
6. Create a new Pull Request

## Release Process

This library uses [semantic versioning](http://semver.org/). For each release, the following needs to be done:

* Bump the version number.
* Push tag to origin such as `git push origin x.x.x`.
* Build and upload the release to the [AppStoreConnect](https://appstoreconnect.apple.com) by running a Fastlane release lane.
* After successfully uploaded the binary, fast-forward the `master` branch: `git checkout master && git merge --ff-only develop && git push origin master`.
* Visit [releases page](https://github.com/thefreerideinc/FreeRide/releases), add release notes to the version and save as draft.
* Go to [AppStoreConnect](https://appstoreconnect.apple.com) and create the release using the same release notes from the GitHub version and submit when it's ideal.
* Publish the GitHub version when the version is officially live in the AppStore.
