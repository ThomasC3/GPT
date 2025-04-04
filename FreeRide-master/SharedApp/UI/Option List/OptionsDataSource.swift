//
//  OptionsDataSource.swift
//  FreeRide
//
//  Created by Rui Magalhães on 05/12/2019.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//


import UIKit

class OptionsDataSource: TableDataSource<String> {

    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(OptionsTableViewCell.self)
    }

    func refresh(items: [String]) {
        refresh()
        sections = [Section(rows: items)]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)

        let cell = tableView.dequeueCell(OptionsTableViewCell.self, for: indexPath)
        cell.configure(with: item)

        return cell
    }
}
