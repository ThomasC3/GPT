//
//  ServiceInformationViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/15/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import MessageUI

class ServiceInformationViewController: TableViewController {

    private let serviceDetailsView: ServiceDetailsView = {
        let view: ServiceDetailsView = .instantiateFromNib()
        return view
    }()

    private let serviceHoursView: ServiceHoursView = {
        let view: ServiceHoursView = .instantiateFromNib()
        return view
    }()
    
    private let pricesView: LocationPricesView = {
        let view: LocationPricesView = .instantiateFromNib()
        return view
    }()

    #if DRIVER
    private let zonesView: LocationZonesView = {
        let view: LocationZonesView = .instantiateFromNib()
        return view
    }()
    #endif

    var location: LocationResponse!

    override func viewDidLoad() {
        title = location.name
        alternateButtonTitle = "Contact Us".localize()

        leftNavigationStyle = .back
        
        if navigationController != nil {
            leftNavigationAction = .pop(true)
        } else {
            leftNavigationAction = .dismiss(true)
        }

        super.viewDidLoad()

        serviceHoursView.configure(with: location)

        if location.paymentEnabled ?? false {
            pricesView.configure(with: location.ridesFareCopy)
        }

        #if DRIVER
        if let zones = location.zones {
            zonesView.configure(zones: zones)
        }
        #endif
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        self.serviceDetailsView.configure(with: self.location)
    }

    override func handleAlternateAction() {
        let vc = LegalViewController()
        vc.type = .contact
        
        if navigationController != nil {
            navigationController?.pushViewController(vc, animated: true)
        } else {
            self.present(vc, animated: true)
        }
    }

    override func initializeTableView() {
        super.initializeTableView()
        tableView.allowsSelection = false
        tableView.dataSource = self
        tableView.delegate = self
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 230
    }

}

extension ServiceInformationViewController: UITableViewDataSource, UITableViewDelegate {

    private enum ServiceInfoRows: CaseIterable {
        case serviceDetails
        case price
        #if DRIVER
        case zones
        #endif
        case serviceHours
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return ServiceInfoRows.allCases.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        switch ServiceInfoRows.allCases[indexPath.row] {
        case .serviceDetails:
            return ContainedTableViewCell(view: serviceDetailsView)
        case .price:
            return ContainedTableViewCell(view: pricesView)
        #if DRIVER
        case .zones:
            return ContainedTableViewCell(view: zonesView)
        #endif
        case .serviceHours:
            return ContainedTableViewCell(view: serviceHoursView)
        }
    }

    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        switch ServiceInfoRows.allCases[indexPath.row] {
        case .serviceDetails:
            return UITableView.automaticDimension
        case .price:
            if location.paymentEnabled == true {
                return UITableView.automaticDimension
            }
            else {
                return 0
            }
        #if DRIVER
        case .zones:
            if location.zones == nil {
                return 0
            }
            else {
                return UITableView.automaticDimension
            }
        #endif
        case .serviceHours:
            return UITableView.automaticDimension
        }
    }

}

extension ServiceInformationViewController: MFMailComposeViewControllerDelegate {

    func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
        controller.dismiss(animated: true)

        switch result {
        case .sent:
            presentAlert("Feedback Sent".localize(), message: "Thank you for your feedback!".localize())
        case .failed:
            presentAlert("Failed Sending".localize(), message: "We were unable to send this email at this time.".localize())
        default:
            break
        }
    }

}
