//
//  CurrentRidesDataSource.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/12/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class ActionsDataSource: TableDataSource<[Action]> {
    weak var cellDelegate: CurrentRidesTableViewCellDelegate?
        
    override func refresh() {
        super.refresh()
        let groups = DriverAppContext.shared.dataStore.fetchActionGroups()
        sections = [Section(rows: groups)]
    }
    
    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(CurrentRidesTableViewCell.self)
        tableView.registerNib(ActionGroupTableViewCell.self)
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        
        let group = value(at: indexPath)
        
        if group.count == 1 {
            let cell = tableView.dequeueCell(CurrentRidesTableViewCell.self, for: indexPath)
            guard let action = group.first else {
                return cell
            }
            
            cell.configure(with: action)
            if action.isDriverArrived && action.isPickup && action.driverArrivedTimestamp != nil {
                cell.showTimer(with: action.driverArrivedTimestamp!)
            }
            cell.delegate = cellDelegate
            return cell
        } else {
            let cell = tableView.dequeueCell(ActionGroupTableViewCell.self, for: indexPath)
            
            guard let firstAction = group.first else {
                return cell
            }
            
            cell.delegate = cellDelegate
            cell.configure(with: group)
            
            if firstAction.isDriverArrived && firstAction.isPickup && firstAction.driverArrivedTimestamp != nil {
                cell.showTimer(with: firstAction.driverArrivedTimestamp!)
            }
            
            return cell
            
        }
    }
}
