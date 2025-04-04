//
//  CurrentRidesViewController.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

extension Notification.Name {

    static let shouldUpdateCurrentRidesQueue = Notification.Name("shouldUpdateCurrentRidesQueue")
}

class CurrentRidesViewController: TableViewController {

    private let dataSource = ActionsDataSource()

    private lazy var addHailedRideView: AddHailedRideView = {
        let view: AddHailedRideView = .instantiateFromNib()
        view.delegate = self

        return view
    }()

    override func viewDidLoad() {
        leftNavigationStyle = .back
        leftNavigationAction = .pop(true)

        rightNavigationStyle = .custom(#imageLiteral(resourceName: "round_playlist_add_black_36pt"))
        topView.rightNavigationButton.tintColor = Theme.Colors.seaFoam
        rightNavigationAction = .custom({
            let isAlreadySet = self.tableView.tableHeaderView == self.addHailedRideView
            self.tableView.tableHeaderView = isAlreadySet ? nil : self.addHailedRideView
        })

        title = "Ride Queue"

        super.viewDidLoad()

        view.backgroundColor = Theme.Colors.backgroundGray
    
        dataSource.cellDelegate = self
        dataSource.refresh()
        
        tableView.reloadData()

        Notification.addObserver(self, name: .shouldUpdateCurrentRidesQueue, selector: #selector(shouldUpdateCurrentRidesQueue))
    }

    override func initializeTableView() {
        super.initializeTableView()
        
        dataSource.registerCellIdentifiers(in: tableView)
        tableView.dataSource = dataSource

        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 240
    }

    @objc private func shouldUpdateCurrentRidesQueue() {
        dataSource.refresh()
        tableView.reloadData()
        ProgressHUD.dismiss()
    }
    
    override func fetchDriverActions() {
        ProgressHUD.show()
        context.api.getActions { result in
            switch result {
            case .success(let responses):
                let ds = self.context.dataStore
                ds.wipeCurrentActions()
                ds.wipeCurrentRides()
               
                for (index, response) in responses.enumerated() {
                    let action = Action(context: ds.mainContext)
                    action.update(with: response)
                    action.index = Int32(index)
                }

                ds.save()

            case .failure(let error):
                self.presentAlert(for: error)
            }
                
            ProgressHUD.dismiss()
            self.shouldUpdateCurrentRidesQueue()
        }
    }
}

extension CurrentRidesViewController: AddHailedRideViewDelegate {

    func addHailedRide(forPassengers passengers: Int, isADA: Bool) {
    
        guard let location = context.currentLocation else {
            return
        }

        let request = RideHailRequest(location: location.id, passengers: passengers, isADA: isADA)
        context.api.rideHail(request) { result in
            self.addHailedRideView.reset()
            self.tableView.tableHeaderView = nil

            switch result {
            case .success:
                Notification.post(.shouldUpdateActions)
                MixpanelManager.trackEvent(
                    MixpanelEvents.DRIVER_HAILED_RIDE_ADDED, properties: [
                        "isADA" : isADA,
                        "passengers" : passengers
                    ]
                )
                
                self.presentAlert("Ride Added", message: "This Ride has successfully been added to your queue.")
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
}

extension CurrentRidesViewController: CurrentRidesTableViewCellDelegate {

    func didSelectActionUpdate(for resourceID: String, isPickupStop: Bool, driverArrived: Bool, isFixedStop: Bool) {
        ProgressHUD.show()
        sendRideUpdate(for: resourceID, isPickupStop: isPickupStop, driverArrived: driverArrived, isFixedStop: isFixedStop)
    }
    
    func didSelectActionContact(for rideID: String) {
        
        guard let action = context.dataStore.fetchAction(rideId: rideID) else {
            return
        }
        
        let ride = Ride(context: self.context.dataStore.mainContext)
        ride.update(with: action)
        let vc = MessengerViewController()
        vc.ride = ride
        let navVC = NavigationController(rootViewController: vc)
        present(navVC, animated: true)
    }
    
    func didSelectActionCancel(for rideID: String, driverArrived: Bool) {
        sendRideCancel(for: rideID, driverArrived: driverArrived)
    }
    
}
