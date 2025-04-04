//
//  TableViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/20/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class TableViewController: StackViewController {

    var tableView = TableView(frame: .zero, style: .plain)

    override func viewDidLoad() {
        super.viewDidLoad()

        addViewsBeforeTable()

        initializeTableView()

        middleStackView.addArrangedSubview(tableView)
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.pinHorizontalEdges(to: middleStackView)
    }

    func initializeTableView() {
        tableView.separatorStyle = .none
        tableView.separatorColor = Theme.Colors.lightGray

        let headerView = UIView(frame: .zero)
        headerView.frame.size.height = 20
        tableView.tableHeaderView = headerView

        tableView.tableFooterView = UIView(frame: .zero)

        tableView.backgroundColor = .clear
        tableView.backgroundView?.backgroundColor = .clear
    }

    func addViewsBeforeTable() {
        // Needs to be overridden
    }
}
