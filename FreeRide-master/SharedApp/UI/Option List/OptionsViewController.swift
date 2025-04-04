//
//  OptionsViewController.swift
//  FreeRide
//
//  Created by Rui Magalhães on 05/12/2019.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import Mixpanel

protocol OptionsViewDelegate: AnyObject {
    /// Use this when an option value is enough.
    func didSelectOptionValue(vc: OptionsViewController, value: String)
    /// Use this when an option at a specific index path is needed.
    func didSelectOptionIndex(vc: OptionsViewController, indexPath: IndexPath)

    func didNotSelectOption()
}

class OptionsViewController: TableViewController {

    enum Tracker {
        case mixpanel
        case ga4
    }

    private lazy var dataSource: OptionsDataSource = {
        return OptionsDataSource()
    }()
    
    weak var delegate: OptionsViewDelegate?
    
    var tracker : Tracker = .mixpanel
    var trackerEventKey : String?
    var rideId : String?
    var headerTitle : String?
    var subOptions: [String]?
    var subOptionsTrigger: Int?
    
    override func viewDidLoad() {
        leftNavigationStyle = .close
        leftNavigationAction = .custom {
            if self.delegate != nil {
                self.delegate?.didNotSelectOption()
            }
            self.dismiss(animated: true)
        }
 
        super.viewDidLoad()
        view.backgroundColor = Theme.Colors.backgroundGray
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        let header: HeaderOptionView = .instantiateFromNib()
        header.configure(with: headerTitle ?? "")
        self.tableView.tableHeaderView = header
    }

    override func initializeTableView() {
        super.initializeTableView()

        dataSource.registerCellIdentifiers(in: tableView)
        tableView.dataSource = dataSource
        tableView.delegate = self

        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 100
    }
        
    func configure(with title: String, tracker: Tracker, trackerEventKey: String, rideId: String, options: [String]) {
        self.tracker = tracker
        self.trackerEventKey = trackerEventKey
        self.rideId = rideId
        self.headerTitle = title
        self.dataSource.refresh(items: options)
        self.tableView.reloadData()
    }
    
    func configureForDelegate(with title: String, options: [String]) {
        self.headerTitle = title
        self.dataSource.refresh(items: options)
        self.tableView.reloadData()
    }
    
    func configureWithSubOptions(with title: String, options: [String], subOptions: [String], subOptionsTrigger: Int) {
        self.headerTitle = title
        self.dataSource.refresh(items: options)
        self.subOptions = subOptions
        self.subOptionsTrigger = subOptionsTrigger
        self.tableView.reloadData()
    }
    
    func handleSelectWithDelegate(_ indexPath: IndexPath) {
        dismiss(animated: true)
        self.delegate?.didSelectOptionValue(vc: self, value: dataSource.value(at: indexPath))
        self.delegate?.didSelectOptionIndex(vc: self, indexPath: indexPath)
    }

    func handleSelect(_ opt: String) {
        sendDataToEventTracker(option: opt)
        dismiss(animated: true)
    }

    func sendDataToEventTracker(option: String) {
        guard let trackerEventKey, let rideId else {
            return;
        }

        let optionEN = option.toEnglishVersion()

        switch tracker {
        case .mixpanel:
            MixpanelManager.trackEvent(
                trackerEventKey,
                properties: [
                    "reason" : optionEN,
                    "ride_id": rideId
                ]
            )
        case .ga4:
            GAManager.trackEvent(
                trackerEventKey,
                properties: [
                    "answer" : optionEN,
                    "ride_id": rideId,
                ]
            )
        }
    }

}

extension OptionsViewController: UITableViewDelegate {

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        if let trigger = subOptionsTrigger, let options = subOptions, trigger == indexPath.row {
            self.dataSource.refresh(items: options)
            subOptionsTrigger = nil
            self.tableView.reloadData()
            return
        }

        if self.delegate != nil {
            self.handleSelectWithDelegate(indexPath)
        } else {
            self.handleSelect(dataSource.value(at: indexPath))
        }
    }

}
